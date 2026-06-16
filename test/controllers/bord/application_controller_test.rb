require "test_helper"

module Bord
  class ApplicationControllerTest < ActionDispatch::IntegrationTest
    setup do
      Bord.reset!
      Bord.metric :users, value: "1"
    end

    teardown do
      Bord.parent_controller = "ActionController::Base"
    end

    test "serves the dashboard in development without configuration" do
      get "/bord"

      assert_response :success
    end

    test "locked in production-like environments without a configured parent controller" do
      assert Bord.locked?(env("production"))
      assert Bord.locked?(env("staging"))
    end

    test "unlocked in development and test" do
      refute Bord.locked?(env("development"))
      refute Bord.locked?(Rails.env)
    end

    test "unlocked in production once a parent controller is configured" do
      Bord.parent_controller = "ApplicationController"

      refute Bord.locked?(env("production"))
    end

    test "404s every endpoint in production without a configured parent controller" do
      with_env("production") do
        get "/bord"
        assert_response :not_found

        post "/bord/actions", params: {owner: "users", record: "gid://bord/Charge/1", method: "refund"}
        assert_response :not_found
      end
    end

    test "serves the dashboard in production once configured" do
      Bord.parent_controller = "ApplicationController"

      with_env("production") do
        get "/bord"

        assert_response :success
      end
    end

    private

    def env(name)
      ActiveSupport::EnvironmentInquirer.new(name)
    end

    def with_env(name)
      original = Rails.method(:env)
      silence_warnings { Rails.define_singleton_method(:env) { ActiveSupport::EnvironmentInquirer.new(name) } }
      yield
    ensure
      silence_warnings { Rails.define_singleton_method(:env, original) }
    end
  end
end
