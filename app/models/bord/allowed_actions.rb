module Bord
  class AllowedActions
    def self.validate!(owner, controller:, params:)
      new(owner, controller).validate!(params)
    end

    def initialize(owner, controller)
      @owner = owner
      @controller = controller
    end

    def validate!(params)
      requested = {
        record: params[:record].to_s,
        method: params[:method].to_s,
        parameters: normalized(ActionParameters.from(params))
      }

      return if requests.include?(requested)

      Rails.logger.warn("Bord action rejected (owner: #{params[:owner].to_s.inspect}, method: #{params[:method].to_s.inspect}, record: #{params[:record].to_s.inspect}): no configured action match")
      raise ActiveRecord::RecordNotFound
    end

    private

    def requests
      definitions.filter_map do |definition|
        next unless definition[:record] && definition[:method]

        {
          record: definition[:record].to_s,
          method: definition[:method].to_s,
          parameters: normalized(definition.except(:record, :method, :confirm, :variant))
        }
      end
    end

    def definitions
      definitions =
        if @owner.is_a?(Page)
          @owner.context = @controller
          @owner.records.flat_map { |record| Array(record.actions) }
        elsif @owner&.kind&.list?
          @owner.items(@controller.view_context).to_a.flat_map { |item| Entry.build(item, view_context: @controller.view_context).actions }
        elsif @owner
          @owner.actions
        else
          []
        end

      definitions.filter_map do |action|
        next unless action.is_a?(Hash)
        definition = action.symbolize_keys[:action]
        next unless definition.is_a?(Hash)

        definition.symbolize_keys
      end
    end

    def normalized(hash)
      hash.map { |key, value| [key.to_s, value.to_s] }.sort
    end
  end
end
