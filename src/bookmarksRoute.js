const express = require('express');
const logger = require('./logger');
const bookmarks = require('./store');
const { v4: uuid } = require('uuid');
const { PORT } = require('./config');
const BookmarksService = require('./bookmarks-service')

const bookmarksRouter = express.Router();
const bodyParser = express.json();

bookmarksRouter
  .route('/bookmarks')
  .get((req, res, next) => {
    //res.status(200).json(bookmarks);
    BookmarksService.getAllBookmarks(req.app.get('db'))
      .then(bookmarks => {
        res.json(bookmarks)
      })
      .catch(next)
  })
  .post(bodyParser, (req, res) => {
    console.log('inside of post');
    const { title, rating, desc, url } = req.body;
    console.log(title, rating, desc, url);

    if (!title) {
      logger.error('Title is required');
      return res.status(400).send('Title is required');
    }
    if (!rating) {
      logger.error('rating is required');
      return res.status(400).send('rating is required');
    }
    if (!desc) {
      logger.error('desc is required');
      return res.status(400).send('desc is required');
    }
    if (!url) {
      logger.error('url is required');
      return res.status(400).send('url is required');
    }

    const newBookmark = { id: uuid(), title, rating, url, desc };

    bookmarks.push(newBookmark);

    res
      .status(201)
      .location(`http://localhost:${PORT}/bookmarks/${newBookmark.id}`)
      .json(newBookmark);
  });

  bookmarksRouter
  .route('/bookmarks/:bookmark_id')
  .get((req, res, next) => {
    const { bookmark_id } = req.params
    BookmarksService.getById(req.app.get('db'), bookmark_id)
      .then(bookmark => {
        if (!bookmark) {
          logger.error(`Bookmark with id ${bookmark_id} not found.`)
          return res.status(404).json({
            error: { message: `Bookmark Not Found` }
          })
        }
        res.json(bookmark)
      })
      .catch(next)
  })
  .delete((req, res) => {
    const { id } = req.params;

    const bookmarkIndex = bookmarks.findIndex((bookmark) => bookmark.id === id);

    console.log(bookmarkIndex, id, bookmarks[3]);

    if (bookmarkIndex === -1) {
      logger.error(`Bookmark with id ${id} not found`);
      return res.status(404).send('Bookmark not found');
    }

    bookmarks.splice(bookmarkIndex, 1);

    logger.info(`Bookmark with id: ${id} has been deleted`);
    res.status(204).end();
  });

module.exports = bookmarksRouter;