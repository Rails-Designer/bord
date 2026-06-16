module Bord
  class Widget
    include Conditionable

    attr_reader :id, :kind, :label, :icon, :href, :actions, :position

    def initialize(id:, kind:, label: nil, icon: nil, href: nil, items: nil, value: nil, actions: [], position: nil, **options)
      @id = id.to_s.parameterize
      @kind = kind.to_s.inquiry
      @label = label || id.to_s.humanize
      @icon = icon
      @href = href
      @items = items
      @value = value
      @actions = actions.map { it.symbolize_keys }
      @position = position && Options.position(position, "widget :#{id}")

      @if_condition = options.delete(:if)
      @unless_condition = options.delete(:unless)

      Options.assert_known!(options, context: "widget :#{id}")
    end

    def value(context = nil)
      return @value unless @value.respond_to?(:call)

      context ? context.instance_exec(&@value) : @value.call
    end

    def items(context = nil)
      return @items unless @items.respond_to?(:call)

      context ? context.instance_exec(&@items) : @items.call
    end

    def decorate(view_context: nil)
      Widget::Decorator.new(self, view_context: view_context)
    end
  end
end
