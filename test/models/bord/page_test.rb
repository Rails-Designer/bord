require "test_helper"

module Bord
  class PageTest < ActiveSupport::TestCase
    setup do
      Bord.reset!

      Bord.page :items,
        label: "Items",
        description: "All items",
        records: -> {
          (1..3).map { |index| {title: "Item #{index}", description: "Desc #{index}", actions: []} }
        },
        record: ->(id) {
          {title: "Item #{id}", description: "Detail for #{id}", fields: [{label: "ID", value: id}]}
        }
    end

    test ".all returns all configured pages" do
      assert_equal 1, Page.all.size
      assert_equal "items", Page.all.first.id
    end

    test ".find! returns page by string id" do
      page = Page.find!("items")
      assert_equal "Items", page.label
      assert_equal "All items", page.description
    end

    test ".find! raises RecordNotFound for unknown id" do
      assert_raises(ActiveRecord::RecordNotFound) { Page.find!("unknown") }
    end

    test "#records returns Record objects from records lambda" do
      records = Page.find!("items").records
      assert_equal 3, records.size
      assert_kind_of Page::Record, records.first
      assert_equal "Item 1", records.first.title
    end

    test "#records returns empty array when records lambda returns nil" do
      Bord.reset!
      Bord.page :empty, label: "Empty", records: -> { nil }
      assert_equal [], Page.find!("empty").records
    end

    test "#records rejects unknown record keys" do
      Bord.reset!
      Bord.page :items, label: "Items", records: -> { [{title: "Item", href: "/items/1"}] }

      error = assert_raises(ArgumentError) { Page.find!("items").records }
      assert_match(/Unknown key :href/, error.message)
      assert_match(/page :items/, error.message)
    end

    test "#records wraps missing title errors with the page id" do
      Bord.reset!
      Bord.page :items, label: "Items", records: -> { [{description: "No title"}] }

      error = assert_raises(ArgumentError) { Page.find!("items").records }
      assert_match(/missing keyword: :title/, error.message)
      assert_match(/page :items/, error.message)
    end

    test "#records passes params via context" do
      page = Page.find!("items")
      page.context = self
      assert_equal 3, page.records.size
    end

    test "#find_record returns record when record lambda configured" do
      page = Page.find!("items")
      page.context = self
      result = page.find_record("1")
      assert_equal "Item 1", result[:title]
      assert_equal "Detail for 1", result[:description]
      assert_equal [{label: "ID", value: "1"}], result[:fields]
    end

    test "#find_record raises when no record lambda" do
      Bord.reset!
      Bord.page :simple, label: "Simple", records: -> { [] }
      assert_raises(ActiveRecord::RecordNotFound) { Page.find!("simple").find_record("1") }
    end

    test "Record constructs with default values" do
      record = Page::Record.new(title: "Test")
      assert_equal "Test", record.title
      assert_nil record.icon
      assert_nil record.description
      assert_equal [], record.actions
    end
  end
end
