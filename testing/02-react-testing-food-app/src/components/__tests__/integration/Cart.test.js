import { fireEvent, render, screen } from "@testing-library/react";
import data from '../mocks/restaurantMenuMockData.json'
import { act } from "react-dom/test-utils";
import { BrowserRouter } from "react-router-dom";
import appStore from "../../../utils/appStore";
import { Provider } from "react-redux";
import RestaurantMenu from "../../RestaurantMenu";
import Cart from "../../Cart";
import Header from "../../Header";

// Mock the fetch function for getRestaurantMenu API call
global.fetch = jest.fn(() => {
    return Promise.resolve({
        json: () => {
            return Promise.resolve(data)
        }
    })
})

describe("Cart Item Test Cases", () => {
    it("Should add an item to the cart when 'Add to Cart' button is clicked", async () => {
        await act(async () => {
            render(
                <BrowserRouter>
                    <Provider store={appStore}>
                        <Header/>
                        <RestaurantMenu />
                        <Cart />
                    </Provider>
                </BrowserRouter>
            )
        });

        // Iniitially, the cart should be empty
        expect(screen.getByText('Cart - (0 items)')).toBeInTheDocument();

        // Select the "Signature Salads" accordion and click it to expand
        const saladsAccordion = screen.getByText(/Signature Salads/i);
        fireEvent.click(saladsAccordion);

        // Wait for the food items to be rendered after expanding the accordion
        const foodItems = screen.getAllByTestId("foodItems");
        expect(foodItems.length).toBe(3); // There are 3 recommended items in the mock data

        // Click the "Add to Cart" button for the first food item
        const firstAddButton = screen.getAllByRole("button", { name: /Add/ })[0];
        fireEvent.click(firstAddButton);
        
        // After clicking "Add to Cart", the cart should now have 1 item
        expect(screen.getByText('Cart - (1 items)')).toBeInTheDocument();

        // Click the "Add to Cart" button for the first food item again
        fireEvent.click(firstAddButton);

        // After clicking "Add to Cart" again, the cart should now have 2 items
        expect(screen.getByText('Cart - (2 items)')).toBeInTheDocument();

        // Cart should now have 2 items after adding the same item twice
        const foodItemsAfterAdding = screen.getAllByTestId("foodItems");
        expect(foodItemsAfterAdding).toHaveLength(5); // We should have 5 food items in total after adding the same item twice (3 original + 2 added to cart)
    
    
        // Click the "Clear Cart" button to remove all items from the cart
        const clearCartButton = screen.getByRole("button", { name: /Clear Cart/i });
        fireEvent.click(clearCartButton);

        // After clearing the cart, it should be empty again
        const foodItemsAfterClearing = screen.getAllByTestId("foodItems");
        expect(screen.getByText('Cart - (0 items)')).toBeInTheDocument();
        expect(foodItemsAfterClearing).toHaveLength(3); // The food items should be back to the original 3 after clearing the cart
    })
})