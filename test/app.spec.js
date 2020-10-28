'use strict';

const app = require('../src/app');

describe('App', () => {
  it('Get / responds with 200 containing "Hello, world!"', () => {
    // eslint-disable-next-line no-undef
    return supertest(app)
      .get('/')
      .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
      .expect(200, 'Hello, world!');
  });
}); 