module Bord
  module Conditionable
    def show?(context)
      (@if_condition.nil? || context.instance_exec(&@if_condition)) &&
        (@unless_condition.nil? || !context.instance_exec(&@unless_condition))
    end
  end
end
