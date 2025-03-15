export class Pair<L, R> {

    constructor(left: L, right: R) {
        this.left = left;
        this.right = right;
    }

    public left: L;
    public right: R;
}