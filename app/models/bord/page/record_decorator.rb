module Bord
  class Page
    class RecordDecorator < SimpleDelegator
      def initialize(record, page:, view_context: nil)
        super(record)

        @page = page
        @view_context = view_context
      end

      def actions
        entry = Entry.build(__getobj__, view_context: @view_context, page: @page)
        fields = __getobj__.is_a?(Hash) ? Array(__getobj__[:fields]) : []

        [
          {action: "remove", targets: "#page-detail > *"},
          {
            action: "append",
            target: "page-detail",
            template: "bord-page-detail",
            data: {title: entry.title, description: entry.description}
          }
        ].tap do |attract_actions|
          fields.each do |field|
            attract_actions << {
              action: "append",
              target: "#page-detail .details",
              template: "bord-page-field",
              data: {label: field[:label], value: field[:value]}
            }
          end

          attract_actions.concat(
            AttractActions.build(
              entry.actions,
              target_selector: "#page-detail .actions",
              owner: "page:#{@page.id}"
            )
          )
        end
      end
    end
  end
end
