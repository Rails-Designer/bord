require "test_helper"

module Bord
  class ConfigurationTest < ActiveSupport::TestCase
    setup { Bord.reset! }

    test "raises on duplicate widget ids" do
      Bord.metric :users, value: "1"

      error = assert_raises(ArgumentError) { Bord.metric :users, value: "2" }
      assert_match(/Widget :users is already defined/, error.message)
    end

    test "raises on duplicate widget ids across categories" do
      Bord.category :financials do
        metric :users, value: "1"
      end

      error = assert_raises(ArgumentError) do
        Bord.category :operations do
          metric :users, value: "2"
        end
      end

      assert_match(/Widget :users is already defined/, error.message)
    end

    test "raises on duplicate category ids" do
      Bord.category :financials

      error = assert_raises(ArgumentError) { Bord.category :financials }
      assert_match(/Category :financials is already defined/, error.message)
    end

    test "raises on duplicate page ids" do
      Bord.page :users, records: -> { [] }

      error = assert_raises(ArgumentError) { Bord.page :users, records: -> { [] } }
      assert_match(/Page :users is already defined/, error.message)
    end

    test "coerces string positions" do
      Bord.category :financials, position: "2"
      assert_equal 2, Bord.categories.first.position
    end

    test "raises on invalid positions" do
      error = assert_raises(ArgumentError) { Bord.category :financials, position: "high" }
      assert_match(/Invalid position "high" for category :financials/, error.message)
    end

    test "raises on unknown widget options" do
      error = assert_raises(ArgumentError) { Bord.metric :users, value: "1", sub_title: "nope" }
      assert_match(/Unknown option :sub_title for widget :users/, error.message)
    end

    test "raises on unknown category options" do
      error = assert_raises(ArgumentError) { Bord.category :financials, colour: "red" }
      assert_match(/Unknown option :colour for category :financials/, error.message)
    end

    test "raises on unknown page options" do
      error = assert_raises(ArgumentError) { Bord.page :users, records: -> { [] }, if: -> { true } }
      assert_match(/Unknown option :if for page :users/, error.message)
    end
  end
end
