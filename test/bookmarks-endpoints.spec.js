const knex = require("knex");
const app = require("../src/app");
const supertest = require("supertest");
const BookmarksService = require("../src/bookmarks-service");
const { expect } = require("chai");
const {makeBookmarksArray, makeMaliciousBookmark} = require('./bookmarks-fixtures');
const { post } = require("../src/app");
const { default: expectCt } = require("helmet/dist/middlewares/expect-ct");

describe("Bookmarks endpoints", function () {
  let db;

  before("make knex instance", () => {
    db = knex({
      client: "pg",
      connection: process.env.TEST_DB_URL,
    });
    app.set('db', db)
  });

  after("disconnect from db", () => db.destroy());

  before("clean the table", () => db("bookmarks").truncate());

  afterEach('cleanup the table', () => db('bookmarks').truncate())

  describe("Unauthorized requests", () => {
    it("responds with 401 Unauthorized request for GET /bookmarks", () => {
      return supertest(app)
        .get("/bookmarks")
        .expect(401, { error: "Unauthorized request" });
    });
    it('responds with 401 Unauthorized request for GET /bookmarks/:id', () => {
        return supertest(app)
            .get('/bookmarks/:id')
            .expect(401, {error: 'Unauthorized request'})
    })
    it('responds with 401 Unauthorized request for POST /bookmarks', () => {
      return supertest(app)
          .post('/bookmarks')
          .expect(401, {error: 'Unauthorized request'})
  })
  it('responds with 401 Unauthorized request for DELETE /bookmarks:id', () => {
    return supertest(app)
        .delete('/bookmarks/:id')
        .expect(401, {error: 'Unauthorized request'})
})
  });

  describe('GET /bookmarks', () => {
    context('Given no bookmarks', () => {
        it('responds with 200 and an empty list', () => {
            return supertest(app)
                .get('/bookmarks')
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(200, [])
        })
    })

    context("Given there are bookmarks in the database", () => {
        const testBookmarks = makeBookmarksArray()
  
      beforeEach("insert bookmarks", () => {
        return db
          .into("bookmarks")
          .insert(testBookmarks);
      });
  
     it('it responds with 200 and all of the articles', () => {
           return supertest(app)
             .get('/bookmarks')
             .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
             .expect(200, testBookmarks)
             // TODO: add more assertions about the body
         })         
    });
  })

  describe('GET /bookmarks/:id', () => {
      context('Given there are no bookmarks in database', () => {
          it('Responds with 404 when bookmark does not exist', () => {
              return supertest(app)
                .get('/bookmarks/50')
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(404, {
                    error: {message: `Bookmark Not Found` }
                })
          })
      })

      context('Given an xss attack bookmark', () => {
        const { maliciousBookmark, expectedBookmark } = makeMaliciousBookmark()

        beforeEach('insert malicious bookmark', () => {
          return db
            .into('bookmarks')
            .insert([ maliciousBookmark ])
        })

        it('removes XSS attack content', () => {
          return supertest(app)
            .get( `/bookmarks/`)
            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
            .expect(200)
            .expect(res => {
              expect(res.body[0].title).to.eql(expectedBookmark.title)
              expect(res.body[0].description).to.eql(expectedBookmark.description)
            })
        })
      })

      context('Given there are bookmarks in the database', () => {
        const testBookmarks = makeBookmarksArray()

        beforeEach('insert bookmarks', () => {
            return db
              .into('bookmarks')
              .insert(testBookmarks)
          })

          it('Responds with 200 and the specified bookmark', () => {
            const bookmarkId = 2
            const expectedBookmark = testBookmarks[bookmarkId - 1]
            return supertest(app)
                .get(`/bookmarks/${bookmarkId}`)
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(200, expectedBookmark)
          })
      })
  })

  describe('POST /bookmarks', () => {
    it('Creates a new bookmark, responding with 204 and the new bookmark', () => {
      const newBookmark = {
        title: "New Bookmark test",
        url: "http://wwww.test.com",
        description: "New Bookmark test desc.....",
        rating: 5,
      }

      return supertest(app)
        .post('/bookmarks')
        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
        .send(newBookmark)
        .expect(201)
        .expect(res => {
          expect(res.body.title).to.eql(newBookmark.title)
          expect(res.body.url).to.eql(newBookmark.url)
          expect(res.body.description).to.eql(newBookmark.description)
          expect(res.body.rating).to.equal(newBookmark.rating)
          expect(res.body).to.have.property('id');
          expect(res.headers.location).to.eql(`/bookmarks/${res.body.id}`)
        })
        .then(res => {
          supertest(app)
            .get(`/bookmarks/${res.body.id}`)
            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
            .expect(res.body)
        })
    })

    const requiredFields = ['title', 'url', 'rating', 'description']

    requiredFields.forEach(field => {
      const newBookmark = {
        title: "New Bookmark test",
        url: "http://wwww.test.com",
        description: "New Bookmark test desc.....",
        rating: "5",
      }

      it(`reponds with 400 and an error message when the ${field} is missing`, () => {
        delete newBookmark[field]

        return supertest(app)
          .post('/bookmarks')
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .send(newBookmark)
          .expect(400, {
            error: { message : `${field} is required`}
          })
      })
    })
    it('removes XSS attack content from response', () => {
      const { maliciousBookmark, expectedBookmark } = makeMaliciousBookmark()
      return supertest(app)
        .post(`/bookmarks`)
        .send(maliciousBookmark)
        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
        .expect(201)
        .expect(res => {
          expect(res.body.title).to.eql(expectedBookmark.title)
          expect(res.body.description).to.eql(expectedBookmark.description)
        })
        .then()
    })
    it('responds with 400 when rating is not a number between 0 and 5', () => {
      const invalidBookmark = {
        title: 'test title',
        url: 'https://test.com',
        rating: 'INVALID',
        description: 'test description'
      }
      return supertest(app)
        .post('/bookmarks')
        .send(invalidBookmark)
        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
        .expect(400, {
          error: { message : `rating must be a number between 0 and 5`}
        }) 
    })

    it('responds with 400 when url is not valid', () => {
      const invalidBookmark = {
        title: 'test title',
        url: 'INVALID URL',
        rating: 4,
        description: 'test description'
      }
      return supertest(app)
        .post('/bookmarks')
        .send(invalidBookmark)
        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
        .expect(400, {
          error: { message : `Invalid url supplied`}
        })
    })
  })

  describe('DELETE /bookmarks/:id', () => {
    context('Given there are bookmarks in the database', () => {
      const testBookmarks = makeBookmarksArray()

      beforeEach('insert bookmarks', () => {
        return db
          .into('bookmarks')
          .insert(testBookmarks)
      })

      it('responds with 204 and removes the specifed bookmark', () => {
        const idToDelete = 3
        const expectedBookmarks = testBookmarks.filter(bookmark => bookmark.id !== idToDelete)
        return supertest(app)
          .delete(`/bookmarks/${idToDelete}`)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(204)
          .then(res => {
            supertest(app)
              .get(`/bookmarks`)
              .expect(expectedBookmarks)
          })
      })
    })

    context('Given no bookmarks', () => {
      it('Responds with 404 when bookmark does not exist', () => {
        return supertest(app)
          .delete('/bookmarks/50')
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(404, {
              error: {message: `Bookmark Not Found` }
          })
      })
    })
  })
});