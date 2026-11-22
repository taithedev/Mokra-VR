import test from 'node:test';
import assert from 'node:assert/strict';
import {validUsername,validPassword,validColor,validMode,validDensity,displayNameValid} from '../lib/validators.mjs';
test('username validates correctly',()=>{assert.equal(validUsername('tai_dev'),true);assert.equal(validUsername('a'),false);assert.equal(validUsername('bad name'),false)});
test('password length is enforced',()=>{assert.equal(validPassword('someStrongPassword'),true);assert.equal(validPassword('123'),false);assert.equal(validPassword('x'.repeat(129)),false)});
test('saved hex colors and particle options are validated',()=>{
assert.equal(validColor('#aB12cD'),true);assert.equal(validColor('blue'),false);
assert.equal(validMode('rainbow'),true);assert.equal(validMode('solid'),true);assert.equal(validMode('bad'),false);
assert.equal(validDensity(2),true);assert.equal(validDensity(4),true);assert.equal(validDensity(0),false);
assert.equal(displayNameValid('Player'),true);assert.equal(displayNameValid(''),false);
});
