import {sortedUsers} from '../index';

describe('sortedUsers', () => {
    test('should return an array of users', () => {
        const result = sortedUsers();

        expect(result).toBeInstanceOf(Array);
    });

    test('should not be undefined', () => {
        const result = sortedUsers();

        expect(result).not.toBeUndefined();
    });

    test('first element should be the user with the lowest age', () => {
        const result = sortedUsers();

        expect(result[0].age).toBe(25);
    });

    test('last element should be the user with the highest age', () => {
        const result = sortedUsers();

        expect(result[result.length - 1].age).toBe(35);
    });
})