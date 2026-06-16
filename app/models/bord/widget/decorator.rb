module Bord
  class Widget
    class Decorator < SimpleDelegator
      def initialize(widget, view_context: nil)
        super(widget)

        @view_context = view_context
      end

      def actions
        return value_actions unless kind.list?

        items(@view_context).to_a.flat_map { entry_actions(it) }
      end

      private

      def value_actions
        [
          {
            action: "replace",
            target: "widget-#{id}-value",
            template: href ? "bord-value-link" : "bord-value",
            data: {value: value(@view_context)}
          }
        ].tap do |attract_actions|
          if href
            attract_actions << {
              action: "setAttributes",
              targets: "#widget-#{id} .value",
              data: {href: href}
            }
          end
        end
      end

      def entry_actions(item)
        entry = Entry.build(item, view_context: @view_context)

        [
          {
            action: "append",
            target: "widget-#{id}-entries",
            template: "bord-entry",
            data: {label: entry.title}
          }
        ].tap do |attract_actions|
          attributes = {href: entry.href}.compact

          if attributes.any?
            attract_actions << {
              action: "setAttributes",
              targets: "#widget-#{id}-entries > :last-child",
              data: attributes
            }
          end

          attract_actions.concat(
            AttractActions.build(
              entry.actions,
              target_selector: "#widget-#{id}-entries > :last-child .actions",
              owner: id
            )
          )
        end
      end
    end
  end
end
