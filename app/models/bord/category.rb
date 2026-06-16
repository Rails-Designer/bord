module Bord
  class Category
    include Conditionable

    attr_reader :id, :label, :widgets, :position

    def initialize(id:, label: nil, position: nil, **options)
      @id = id.to_s
      @label = label || id.to_s.humanize
      @widgets = []
      @position = position && Options.position(position, "category :#{id}")

      @if_condition = options.delete(:if)
      @unless_condition = options.delete(:unless)
      Options.assert_known!(options, context: "category :#{id}")
    end
  end
end
