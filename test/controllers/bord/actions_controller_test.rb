require "test_helper"

module Bord
  class ActionsControllerTest < ActionDispatch::IntegrationTest
    setup do
      Bord.reset!

      Bord.list :charges,
        items: -> {
          [{
            label: Charge.new(1).label,
            actions: [
              {label: "Refund", action: {record: Charge.new(1).to_gid.to_s, method: :refund, customer_id: 1}},
              {label: "Failing refund", action: {record: Charge.new(1).to_gid.to_s, method: :fail_refund, customer_id: 1}}
            ]
          }]
        }
    end

    test "calls record method via GlobalID and redirects" do
      charge = Charge.new(1)
      post "/bord/actions",
        params: {owner: "charges", record: charge.to_gid.to_s, method: "refund", params: {customer_id: 1}.to_json}

      assert_redirected_to "/bord/"
      assert_equal "Action completed", flash[:notice]
    end

    test "returns attract actions for a record action" do
      charge = Charge.new(1)

      post "/bord/actions",
        params: {
          owner: "charges",
          record: charge.to_gid.to_s,
          method: "refund",
          params: {customer_id: 1}.to_json
        }.to_json,
        headers: {
          "Content-Type" => "application/json",
          "Accept" => "application/vnd.attract+json",
          "Attract" => "true"
        }

      assert_response :success
      actions = response.parsed_body["actions"]

      assert_equal "remove", actions.first["action"]
      assert_equal "bord-entry", actions.second["template"]
    end

    test "404s when the method does not match a declared action" do
      charge = Charge.new(1)
      post "/bord/actions",
        params: {owner: "charges", record: charge.to_gid.to_s, method: "destroy", params: {customer_id: 1}.to_json}

      assert_response :not_found
    end

    test "404s when the record does not match a declared action" do
      charge = Charge.new(999)
      post "/bord/actions",
        params: {owner: "charges", record: charge.to_gid.to_s, method: "refund", params: {customer_id: 999}.to_json}

      assert_response :not_found
    end

    test "404s when extra parameters are tampered" do
      charge = Charge.new(1)
      post "/bord/actions",
        params: {owner: "charges", record: charge.to_gid.to_s, method: "refund", params: {customer_id: 2}.to_json}

      assert_response :not_found
    end

    test "404s when no record is posted" do
      post "/bord/actions", params: {owner: "charges", method: "refund", params: {customer_id: 1}.to_json}

      assert_response :not_found
    end

    test "404s for an unknown owner" do
      charge = Charge.new(1)
      post "/bord/actions",
        params: {owner: "unknown_widget", record: charge.to_gid.to_s, method: "refund", params: {customer_id: 1}.to_json}

      assert_response :not_found
    end

    test "propagates errors from a declared action" do
      charge = Charge.new(1)

      assert_raises(StandardError) do
        post "/bord/actions",
          params: {owner: "charges", record: charge.to_gid.to_s, method: "fail_refund", params: {customer_id: 1}.to_json}
      end
    end
  end
end
