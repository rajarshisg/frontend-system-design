import { render, screen, fireEvent } from "@testing-library/react";
import Header from "../../Header";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import appStore from "../../../utils/appStore";

describe("Header Test Cases", () => {
    it("Should load login button component", () => {
        render(
            <BrowserRouter>
                <Provider store={appStore}>
                    <Header />
                </Provider>
            </BrowserRouter>
        );

        const loginButton = screen.getByRole("button", {
            name: "Login"
        });

        expect(loginButton).toBeInTheDocument();
    })

    it("Should load cart component", () => {
        render(
            <BrowserRouter>
                <Provider store={appStore}>
                    <Header />
                </Provider>
            </BrowserRouter>
        );

        const cartButton = screen.getByText(/Cart/);

        expect(cartButton).toBeInTheDocument();
    })

    it("Should change login button to logout button on click", () => {
        render(
            <BrowserRouter>
                <Provider store={appStore}>
                    <Header />
                </Provider>
            </BrowserRouter>
        );

        const loginButton = screen.getByRole("button", {
            name: "Login"
        });

        fireEvent.click(loginButton);

        const logoutButton = screen.getByRole("button", {
            name: "Logout"
        });

        expect(logoutButton).toBeInTheDocument();        
    })
})