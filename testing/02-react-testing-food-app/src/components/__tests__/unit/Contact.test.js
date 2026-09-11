import { render, screen } from "@testing-library/react";
import Contact from "../../Contact";

describe("Contact Us Page Test Cases", () => {
    test("Should load contact us component", () => {
        render(<Contact />);

        const heading = screen.getByRole("heading");

        expect(heading).toBeInTheDocument();
    })

    // test() and it() are same, we can use any of them.
    it("Should load button inside contact us component", () => {
        render(<Contact />);

        const button = screen.getByRole("button");

        expect(button).toBeInTheDocument();
    })

    it("Should load input name inside contact us component", () => {
        render(<Contact />);

        const inputName = screen.getByPlaceholderText("name");

        expect(inputName).toBeInTheDocument();
    })

    it("Should load two input boxes inside contact us component", () => {
        render(<Contact />);   

        // Querying all the input boxes using role attribute
        const inputBoxes = screen.getAllByRole("textbox");

        expect(inputBoxes.length).toBe(2);
    })
})