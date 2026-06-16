module Bord
  class Entry
    attr_reader :id, :title, :description, :href, :icon, :actions

    def initialize(id: nil, title: nil, description: nil, href: nil, icon: nil, actions: [])
      @id = id
      @title = title
      @description = description
      @href = href
      @icon = icon
      @actions = actions
    end

    class << self
      def build(record, view_context: nil, page: nil)
        return from_hash(record) if record.is_a?(Hash)
        return from_page_record(record) if record.is_a?(Page::Record)

        attributes = infer(record, view_context, page)

        if record.respond_to?(:to_bord)
          override = record.to_bord.symbolize_keys
          override[:title] ||= override.delete(:label)
          attributes.merge!(override)
        end

        from_hash(attributes)
      end

      def from_hash(attributes)
        attributes = attributes.symbolize_keys

        new(
          id: attributes[:id],
          title: attributes[:title] || attributes[:label],
          description: attributes[:description] || attributes[:subtitle],
          href: attributes[:href],
          icon: attributes[:icon],
          actions: attributes[:actions] || []
        )
      end

      def from_page_record(record)
        new(
          title: record.title,
          description: record.description,
          icon: record.icon,
          actions: record.actions
        )
      end

      def infer(record, view_context, page)
        {
          id: identifier(record),
          title: default_title(record),
          description: nil,
          href: href(record, view_context, page),
          icon: icon(record),
          actions: []
        }
      end

      def default_title(record)
        return record.to_s unless record.respond_to?(:model_name)

        identifier = identifier(record)

        identifier ? "#{record.model_name.human} ##{identifier}" : record.model_name.human
      end

      def identifier(record)
        return record.to_gid.to_s if record.respond_to?(:to_gid)

        record.to_param if record.respond_to?(:to_param)
      rescue
        nil
      end

      def href(record, view_context, page)
        return unless view_context

        if page
          view_context.bord.page_record_path(page.id, record.to_param)
        elsif view_context.respond_to?(:main_app)
          view_context.main_app.polymorphic_path(record)
        end
      rescue
        nil
      end

      def icon(record)
        return unless record.respond_to?(:model_name)

        record.model_name.singular
      end
    end
  end
end
