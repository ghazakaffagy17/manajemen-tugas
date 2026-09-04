const {
    calculatePriorityFromDeadline
} = require("../src/routes/taskRoutes");


test("Deadline kosong menghasilkan Rendah", () => {

    expect(
        calculatePriorityFromDeadline(null)
    ).toBe("Rendah");

});


test("Deadline kurang dari 24 jam menghasilkan Tinggi", () => {

    const deadline =
        new Date(Date.now() + 10 * 60 * 60 * 1000);

    expect(
        calculatePriorityFromDeadline(deadline)
    ).toBe("Tinggi");

});


test("Deadline antara 24 sampai 72 jam menghasilkan Sedang", () => {

    const deadline =
        new Date(Date.now() + 48 * 60 * 60 * 1000);

    expect(
        calculatePriorityFromDeadline(deadline)
    ).toBe("Sedang");

});


test("Deadline lebih dari 72 jam menghasilkan Rendah", () => {

    const deadline =
        new Date(Date.now() + 100 * 60 * 60 * 1000);

    expect(
        calculatePriorityFromDeadline(deadline)
    ).toBe("Rendah");

});