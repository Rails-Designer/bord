module Bord
  module AttractActions
    module_function

    def build(actions, target_selector:, owner:)
      Array(actions).flat_map do |action|
        action = action.symbolize_keys
        href = action[:href]
        definition = action[:action]

        if definition
          definition_actions(action, definition.symbolize_keys, target_selector, owner)
        elsif href
          link_actions(action, href, target_selector)
        else
          []
        end
      end
    end

    def response_actions(widget, page, view_context)
      return page.decorate.actions if page
      return [flash("Action completed")] unless widget

      if widget.kind.list?
        [
          {action: "remove", targets: "#widget-#{widget.id}-entries > *"},
          *widget.decorate(view_context: view_context).actions
        ]
      else
        [flash("Action completed"), *widget.decorate(view_context: view_context).actions]
      end
    end

    def flash(message)
      {
        action: "replace",
        target: "bord-flash",
        template: "bord-flash-template",
        data: {message: message}
      }
    end

    def link_actions(action, href, target_selector)
      label = action[:label]
      variant = action[:variant]
      attributes = {href: href}
      attributes[:variant] = variant if variant

      [
        {
          action: "append",
          targets: target_selector,
          template: "bord-entry-link",
          data: {label: label}
        },
        {
          action: "setAttributes",
          targets: "#{target_selector} > :last-child",
          data: attributes
        }
      ]
    end

    def definition_actions(action, definition, target_selector, owner)
      label = action[:label]
      record = definition[:record]
      method = definition[:method]
      confirm = action[:confirm] || definition[:confirm]
      variant = action[:variant]
      parameters = definition.except(:record, :method, :confirm, :variant)

      [
        {
          action: "append",
          targets: target_selector,
          template: "bord-entry-action",
          data: {
            label: label,
            owner: owner,
            record: record,
            method: method,
            params: parameters.to_json
          }
        }
      ].tap do |attract_actions|
        attributes = {}
        attributes[:confirm] = confirm if confirm
        attributes[:variant] = variant if variant

        if attributes.any?
          attract_actions << {
            action: "setAttributes",
            targets: "#{target_selector} > :last-child",
            data: attributes
          }
        end
      end
    end
  end
end
