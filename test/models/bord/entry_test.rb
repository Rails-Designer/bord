require "test_helper"

module Bord
  class EntryTest < ActiveSupport::TestCase
    test "builds from a hash" do
      entry = Entry.build({label: "User 1", href: "/users/1"})

      assert_equal "User 1", entry.title
      assert_equal "/users/1", entry.href
    end

    test "uses model name and id without to_bord" do
      record = Class.new do
        def model_name
          ActiveModel::Name.new(self.class, nil, "User")
        end

        def to_param
          "1"
        end
      end.new

      entry = Entry.build(record)

      assert_equal "User #1", entry.title
      assert_equal "1", entry.id
      assert_equal "user", entry.icon
    end

    test "to_bord overrides conventions" do
      record = Class.new do
        def model_name
          ActiveModel::Name.new(self.class, nil, "User")
        end

        def to_param
          "1"
        end

        def to_bord
          {label: "Custom", href: "/custom"}
        end
      end.new

      entry = Entry.build(record)

      assert_equal "Custom", entry.title
      assert_equal "/custom", entry.href
    end

    test "builds from a page record" do
      record = Page::Record.new(title: "Item", description: "Desc")
      entry = Entry.build(record)

      assert_equal "Item", entry.title
      assert_equal "Desc", entry.description
    end
  end
end
