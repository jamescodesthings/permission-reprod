/**
 * Removes an item from an array
 * @param array The array
 * @param elem The item to remove
 */
export default function removeFromArray(array, elem) {
    const index = array.indexOf(elem);
    if (index > -1) {
        array.splice(index, 1);
    }
}
