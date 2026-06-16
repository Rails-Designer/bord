module Bord
  module Options
    module_function

    def position(value, context)
      Integer(value)
    rescue ArgumentError, TypeError
      raise ArgumentError, "Invalid position #{value.inspect} for #{context}"
    end

    def assert_known!(given, context:)
      return if given.empty?

      raise ArgumentError, "Unknown option#{"s" if given.size > 1} #{given.keys.map(&:inspect).join(", ")} for #{context}"
    end
  end
end
