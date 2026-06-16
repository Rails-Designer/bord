require "test_helper"

module Bord
  class WidgetsControllerTest < ActionDispatch::IntegrationTest
    setup do
      Bord.reset!

      Bord.metric :revenue, value: "$1000"
      Bord.list :users,
        items: -> {
          [
            {
              label: "User 1",
              href: "/users/1",
              actions: [
                {
                  label: "Refund",
                  confirm: "Refund?",
                  variant: :danger,
                  action: {record: "gid://bord/Charge/1", method: :refund, customer_id: 1}
                }
              ]
            },
            {label: "User 2"}
          ]
        }
    end

    test "index returns 200" do
      get "/bord"

      assert_response :success
    end

    test "index renders widget shells and attract templates" do
      get "/bord"

      assert_select ".widget", count: 2
      assert_select "template#bord-value"
      assert_select "template#bord-entry"
      assert_includes response.body, "get#/bord/data:mounted"
    end

    test "data returns widget values" do
      get "/bord/data"

      assert_response :success
      actions = response.parsed_body["actions"]

      assert_includes actions, {
        "action" => "replace",
        "target" => "widget-revenue-value",
        "template" => "bord-value",
        "data" => { "value" => "$1000" }
      }
    end

    test "data returns widget items" do
      get "/bord/data"

      actions = response.parsed_body["actions"]
      labels = actions.filter_map { |action| action.dig("data", "label") }

      assert_includes labels, "User 1"
      assert_includes labels, "User 2"
    end

    test "data returns entry links" do
      get "/bord/data"

      actions = response.parsed_body["actions"]
      link_action = actions.find { |action| action["action"] == "setAttributes" && action.dig("data", "href") }

      assert_equal "#widget-users-entries > :last-child", link_action["targets"]
      assert_equal "/users/1", link_action.dig("data", "href")
    end

    test "data returns entry actions" do
      get "/bord/data"

      actions = response.parsed_body["actions"]
      form_action = actions.find { |action| action["template"] == "bord-entry-action" }

      assert_equal "Refund", form_action.dig("data", "label")
      assert_equal "#widget-users-entries > :last-child .actions", form_action["targets"]
      assert_equal "users", form_action.dig("data", "owner")
      assert_equal "gid://bord/Charge/1", form_action.dig("data", "record")
      assert_equal "refund", form_action.dig("data", "method")
      assert_equal({"customer_id" => 1}, JSON.parse(form_action.dig("data", "params")))
    end

    test "data returns entry action confirmation and variant" do
      get "/bord/data"

      actions = response.parsed_body["actions"]
      confirm_action = actions.find { |action| action["action"] == "setAttributes" && action.dig("data", "confirm") }

      assert_equal "Refund?", confirm_action.dig("data", "confirm")
      assert_equal "danger", confirm_action.dig("data", "variant")
    end



    test "orders categories and widgets by position" do
      Bord.reset!

      Bord.category :later, label: "Later", position: 2 do
        metric :second, value: "2", position: 2
        metric :first, value: "1", position: 1
      end

      Bord.category :earlier, label: "Earlier", position: 1 do
        metric :only, value: "only"
      end

      get "/bord"

      assert_equal ["Earlier", "Later"], css_select(".category > .title").map(&:text)
      assert_equal ["widget-first", "widget-second"], css_select("#widget-first, #widget-second").map { it["id"] }
    end

    test "index renders no widgets when none are configured" do
      Bord.reset!

      get "/bord"

      assert_select ".widget", count: 0
    end

    test "index respects if condition" do
      Bord.reset!

      Bord.metric :visible, value: "yes"
      Bord.metric :hidden, value: "no", if: -> { false }

      get "/bord"

      assert_select ".widget", count: 1

      get "/bord/data"

      values = response.parsed_body["actions"].filter_map { |action| action.dig("data", "value") }

      assert_includes values, "yes"
      refute_includes values, "no"
    end

    test "index renders the value as a link when href is set" do
      Bord.reset!

      Bord.metric :mrr, label: "MRR", value: "$1000", href: "/admin/revenue"

      get "/bord"

      assert_select "a.value[href='/admin/revenue']"
    end

    test "data sets the link target when href is set" do
      Bord.reset!

      Bord.metric :mrr, label: "MRR", value: "$1000", href: "/admin/revenue"

      get "/bord/data"

      actions = response.parsed_body["actions"]
      replace = actions.find { it["target"] == "widget-mrr-value" }

      assert_equal "bord-value-link", replace["template"]

      link = actions.find { it["action"] == "setAttributes" }

      assert_equal "#widget-mrr .value", link["targets"]
      assert_equal "/admin/revenue", link.dig("data", "href")
    end
  end
end
