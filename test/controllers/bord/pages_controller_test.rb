require "test_helper"

module Bord
  class PagesControllerTest < ActionDispatch::IntegrationTest
    setup do
      Bord.reset!

      Bord.page :items,
        label: "Items",
        description: "All items",
        records: -> {
          (1..3).map { |index|
            {title: "Item #{index}", description: "Desc #{index}",
             actions: [{label: "View", href: "/items/#{index}"}]}
          }
        },
        record: ->(id) {
          return nil if id == "999"

          {title: "Item #{id}", description: "Detail for #{id}",
           fields: [{label: "ID", value: id}],
           actions: [{label: "Edit", href: "/items/#{id}/edit"}]}
        }

      Bord.page :nodetail,
        label: "No Detail",
        records: -> { [] }
    end

    test "index returns 200" do
      get "/bord/pages/items"
      assert_response :success
    end

    test "index renders page title and description" do
      get "/bord/pages/items"
      assert_select ".page-header .title", text: "Items"
      assert_select ".page-header .description", text: "All items"
    end

    test "index renders the entries shell" do
      get "/bord/pages/items"

      assert_select "#page-entries"
      assert_includes response.body, "get#/bord/pages/items.json:mounted"
    end

    test "index returns record actions" do
      get "/bord/pages/items.json"

      actions = response.parsed_body["actions"]
      record = actions.find { |action| action["template"] == "bord-page-entry" }

      assert_equal "Item 1", record.dig("data", "title")
      assert_equal "Desc 1", record.dig("data", "description")
    end

    test "index returns record links" do
      get "/bord/pages/items.json"

      actions = response.parsed_body["actions"]
      link = actions.find { |action| action["template"] == "bord-entry-link" }

      assert_equal "View", link.dig("data", "label")
    end

    test "index 404 for unknown page" do
      get "/bord/pages/unknown"
      assert_response :not_found
    end

    test "show returns 200" do
      get "/bord/pages/items/records/1"
      assert_response :success
    end

    test "show renders the detail shell" do
      get "/bord/pages/items/records/1"

      assert_select "#page-detail"
      assert_includes response.body, "get#/bord/pages/items/records/1.json:mounted"
    end

    test "show returns record title and description" do
      get "/bord/pages/items/records/1.json"

      actions = response.parsed_body["actions"]
      detail = actions.find { |action| action["template"] == "bord-page-detail" }

      assert_equal "Item 1", detail.dig("data", "title")
      assert_equal "Detail for 1", detail.dig("data", "description")
    end

    test "show returns fields" do
      get "/bord/pages/items/records/1.json"

      actions = response.parsed_body["actions"]
      field = actions.find { |action| action["template"] == "bord-page-field" }

      assert_equal "ID", field.dig("data", "label")
      assert_equal "1", field.dig("data", "value")
    end

    test "show returns record links" do
      get "/bord/pages/items/records/1.json"

      actions = response.parsed_body["actions"]
      link = actions.find { |action| action["template"] == "bord-entry-link" }

      assert_equal "Edit", link.dig("data", "label")
    end

    test "show renders back link" do
      get "/bord/pages/items/records/1"
      assert_select ".back-link[href='/bord/pages/items']"
    end

    test "show 404 for unknown page" do
      get "/bord/pages/unknown/records/1"
      assert_response :not_found
    end

    test "show 404 when page has no record lambda" do
      get "/bord/pages/nodetail/records/1"
      assert_response :not_found
    end

    test "show 404 when record lambda returns nil" do
      get "/bord/pages/items/records/999"
      assert_response :not_found
    end
  end
end
