import { fireEvent, render, screen } from "@testing-library/react";
import Body from "../../Body";
import data from '../mocks/restaurantsListMockData.json'
import { act } from "react-dom/test-utils";
import { BrowserRouter } from "react-router-dom";

// Mock the fetch function for listRestaurants API call
global.fetch = jest.fn(() => {
    return Promise.resolve({
        json: () => {
            return Promise.resolve(data)
        }
    })
})

describe("Integration Test for Search Component", () => {
    it("Should load one restaurant when searching for 'Pizza'", async () => {
        
        await act(async () => {
            render(
                <BrowserRouter>
                    <Body />
                </BrowserRouter>
            );
        });

        const allCards = screen.getAllByTestId("resCard");
        expect(allCards).toHaveLength(9); // We have 9 restaurants in the mock data

        const searchInput = screen.getByTestId("searchInput");
        const searchButton = screen.getByRole("button", {
            name: "Search"
        });

        fireEvent.change(searchInput, {
            target: {
                value: "Pizza"
            }
        });
        fireEvent.click(searchButton);

        const filteredCards = screen.getAllByTestId("resCard");

        expect(filteredCards).toHaveLength(1); // We have 1 restaurants with "Pizza" in their name in the mock data
    })

    it("Should load top rated restaurants when the 'Top Rated' filter is applied", async () => {
        
        await act(async () => {
            render(
                <BrowserRouter>
                    <Body />
                </BrowserRouter>
            );
        });

        const allCards = screen.getAllByTestId("resCard");
        expect(allCards).toHaveLength(9); // We have 9 restaurants in the mock data

        const topRatedButton = screen.getByRole("button", {
            name: "Top Rated Restaurants"
        });

        fireEvent.click(topRatedButton);

        const filteredCards = screen.getAllByTestId("resCard");

        expect(filteredCards).toHaveLength(7); // We have 7 top rated restaurants in the mock data
    })
})
