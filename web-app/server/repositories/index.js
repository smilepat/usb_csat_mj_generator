/**
 * server/repositories/index.js
 * Repository 모듈 통합 내보내기
 */

const BaseRepository = require('./baseRepository');
const promptRepository = require('./promptRepository');
const {
  itemRequestRepository,
  itemJsonRepository,
  itemOutputRepository
} = require('./itemRepository');

module.exports = {
  BaseRepository,
  promptRepository,
  itemRequestRepository,
  itemJsonRepository,
  itemOutputRepository
};
