module Bord
  class Page
    class Decorator < SimpleDelegator
      def initialize(page, view_context: nil)
        super(page)
        @view_context = view_context
      end

      def actions
        [{action: "remove", targets: "#page-entries > *"}].tap do |attract_actions|
          records.each do |record|
            entry = Entry.build(record, view_context: @view_context, page: self)

            attract_actions << {
              action: "append",
              target: "page-entries",
              template: "bord-page-entry",
              data: {title: entry.title, description: entry.description}
            }

            attract_actions.concat(
              AttractActions.build(
                entry.actions,
                target_selector: "#page-entries > :last-child .actions",
                owner: "page:#{id}"
              )
            )
          end
        end
      end
    end
  end
end
