/**
 * Returns seconds as milliseconds.
 * Useful to make time clear when using millisecond timings at a glance.
 */
export default function secondsAsMs(seconds: number) {
    const milliseconds = seconds * 1000;
    return milliseconds;
}
