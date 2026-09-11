import { render, screen } from "@testing-library/react";
import RestaurantCard, { withPromotedLabel } from "../../RestaurantCard";
import mockRestaurantData from "../mocks/restaurantCardMockData.json";

describe("Restaurant Card Test Cases", () => {
    it("Should load restaurant card component", () => {
        render(<RestaurantCard resData={mockRestaurantData} />);

        const heading = screen.getByText("Pizza Paradise");

        expect(heading).toBeInTheDocument();
    })

    it("Should load restaurant card component with promoted label", () => {
        const PromotedRestaurantCard = withPromotedLabel(RestaurantCard);
        render(<PromotedRestaurantCard resData={mockRestaurantData} />);

        const promotedLabel = screen.getByText("Promoted");

        expect(promotedLabel).toBeInTheDocument();
    })
})