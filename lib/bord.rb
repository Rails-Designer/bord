require "bord/version"
require "bord/engine"
require "bord/configuration"
require "bord/loader"
require "bord/options"

module Bord
  mattr_accessor :parent_controller, :title, :brand_hue

  self.parent_controller = "ActionController::Base"
  self.title = "Bord"
  self.brand_hue = 250

  def self.configure
    yield Configuration.new
  end

  def self.draw(&block)
    Configuration.new.instance_eval(&block)
  end

  def self.categories
    @categories ||= []
  end

  def self.uncategoryed_widgets
    @uncategoryed_widgets ||= []
  end

  def self.widgets
    sort_by_position(categories).flat_map { |category| sort_by_position(category.widgets) } +
      sort_by_position(uncategoryed_widgets)
  end

  def self.sort_by_position(collection)
    collection
      .each_with_index
      .sort_by { [it.first.position || Float::INFINITY, it.last] }
      .map(&:first)
  end

  def self.pages
    @pages ||= []
  end

  def self.metric(id, **options)
    Configuration.new.metric(id, **options)
  end

  def self.list(id, **options)
    Configuration.new.list(id, **options)
  end

  def self.category(id, **options, &block)
    Configuration.new.category(id, **options, &block)
  end

  def self.page(id, **options)
    Configuration.new.page(id, **options)
  end

  def self.reset!
    @categories = []
    @uncategoryed_widgets = []
    @pages = []
  end

  def self.locked?(env = Rails.env)
    !env.development? && !env.test? && parent_controller == "ActionController::Base"
  end
end
