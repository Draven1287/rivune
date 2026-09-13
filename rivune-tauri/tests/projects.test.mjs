import test from 'node:test';
import assert from 'node:assert/strict';
import { parseProjects } from './compiled/projects.js';

test('projects recover safe metadata without paths or arbitrary stored fields', () => {
  assert.deepEqual(parseProjects(JSON.stringify([{ id: 'one', name: ' Garden ', createdAt: 1, folderName: 'garden', fileCount: 4, path: '/private/a', access: true }])), [{ id: 'one', name: 'Garden', createdAt: 1, folderName: 'garden', fileCount: 4 }]);
});
test('projects tolerate malformed storage and reject invalid or duplicate records', () => {
  assert.deepEqual(parseProjects('{bad'), []);
  const rows = [{ id:'a', name:'A', createdAt:1 }, { id:'a', name:'Duplicate', createdAt:2 }, { id:'b', name:' ', createdAt:2 }, { id:'c', name:'C', createdAt:'today' }, { id:'d', name:'D', createdAt:3, fileCount:-1 }];
  assert.deepEqual(parseProjects(JSON.stringify(rows)), [{id:'a',name:'A',createdAt:1},{id:'d',name:'D',createdAt:3}]);
});
