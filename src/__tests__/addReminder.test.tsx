import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";

vi.mock("../weather", () => ({ getWeatherSummary: () => Promise.resolve("Rain") }));

describe("Add reminder", () => {
    it("adds a reminder with city and shows it ordered", async () => {
        render(<App />);
        const addButtons = await screen.findAllByRole("button", { name: "＋" });
        await userEvent.click(addButtons[0]);

        await userEvent.type(screen.getByLabelText("text"), "Buy milk");
        await userEvent.type(screen.getByLabelText("city"), "London");
        await userEvent.clear(screen.getByLabelText("time"));
        await userEvent.type(screen.getByLabelText("time"), "07:30");

        await userEvent.click(screen.getByRole("button", { name: /save/i }));
        expect(await screen.findByTitle(/07:30 Buy milk/i)).toBeInTheDocument();
    });
});
