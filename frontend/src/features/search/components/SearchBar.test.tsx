import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SearchBar } from "./SearchBar";

describe("SearchBar", () => {
  it("shows the glowing search box and accessible gradient search icon without an AI badge", () => {
    const { container } = render(
      <SearchBar value="" onChange={vi.fn()} onSubmit={vi.fn()} />,
    );

    expect(screen.queryByText("AI")).not.toBeInTheDocument();
    expect(
      screen.getByRole("search", { name: "Product search" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", {
        name: "Search by product name, ingredient, or concern",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Search products" }),
    ).toBeInTheDocument();
    expect(container.querySelector(".search-box-glow")).toBeInTheDocument();
    expect(
      container.querySelector("linearGradient stop:first-child"),
    ).toHaveAttribute("stop-color", "#8B5CF6");
    expect(
      container.querySelector("linearGradient stop:last-child"),
    ).toHaveAttribute("stop-color", "#EC4899");
  });

  it("submits the current search value with Enter or the search button", () => {
    const onChange = vi.fn();
    const onSubmit = vi.fn();
    render(<SearchBar value="serum" onChange={onChange} onSubmit={onSubmit} />);

    fireEvent.submit(screen.getByRole("search", { name: "Product search" }));

    expect(onChange).toHaveBeenCalledWith("serum");
    expect(onSubmit).toHaveBeenCalledWith("serum");
  });
});
