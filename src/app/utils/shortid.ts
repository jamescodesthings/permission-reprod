/**
 * A function to generate a 6 digit shortid
 *
 * See:
 * https://stackoverflow.com/questions/6248666/how-to-generate-short-uid-like-ax4j9z-in-js
 *
 * Used to trace async log messages
 * i.e. "That's a nice log message but which of the many async calls caused it?"
 */
export default function shortid() {
    const firstPart = (Math.random() * 46656) | 0;
    const secondPart = (Math.random() * 46656) | 0;
    const firstPartstr = ("000" + firstPart.toString(36)).slice(-3);
    const secondPartstr = ("000" + secondPart.toString(36)).slice(-3);
    return firstPartstr + secondPartstr;
}
