/**
 * Linear interpolation between two values A and B by fraction t.
 */
export function lerp(A, B, t) {
    return A + (B - A) * t;
}

/**
 * Returns the intersection point of two line segments AB and CD, if it exists.
 * Returns null otherwise.
 */
export function getIntersection(A, B, C, D) {
    const tTop = (D.x - C.x) * (A.y - C.y) - (D.y - C.y) * (A.x - C.x);
    const uTop = (C.y - A.y) * (A.x - B.x) - (C.x - A.x) * (A.y - B.y);
    const bottom = (D.y - C.y) * (B.x - A.x) - (D.x - C.x) * (B.y - A.y);

    if (bottom !== 0) {
        const t = tTop / bottom;
        const u = uTop / bottom;
        if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
            return {
                x: lerp(A.x, B.x, t),
                y: lerp(A.y, B.y, t),
                offset: t
            };
        }
    }
    return null;
}

/**
 * Detects if two polygons intersect.
 * Polygons are arrays of points: [{x, y}, ...]
 */
export function polysIntersect(poly1, poly2) {
    for (let i = 0; i < poly1.length; i++) {
        for (let j = 0; j < poly2.length; j++) {
            const A = poly1[i];
            const B = poly1[(i + 1) % poly1.length];
            const C = poly2[j];
            const D = poly2[(j + 1) % poly2.length];

            const touch = getIntersection(A, B, C, D);
            if (touch) {
                return true;
            }
        }
    }
    return false;
}

/**
 * Generates an RGBA color string representing weight/activation values.
 * Positive values range towards blue/cyan, negative towards magenta/amber.
 */
export function getRGBA(value) {
    const alpha = Math.abs(value);
    const R = value < 0 ? 255 : 0;
    const G = value > 0 ? 255 : 100;
    const B = value > 0 ? 255 : 150;
    return `rgba(${R},${G},${B},${alpha})`;
}
