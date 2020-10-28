const knex = require("knex");
const app = require("../src/app");
const supertest = require("supertest");
const BookmarksService = require("../src/bookmarks-service");
const { expect } = require("chai");
const {makeBookmarksArray} = require('./bookmarks-fixtures')

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
          it('Responds with 404 when bookmakr does not exist', () => {
              return supertest(app)
                .get('/bookmarks/50')
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                .expect(404, {
                    error: {message: `Bookmark Not Found` }
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

});