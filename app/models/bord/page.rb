module Bord
  class Page
    Record = Data.define(:icon, :title, :description, :actions) do
      def initialize(title:, icon: nil, description: nil, actions: [])
        super
      end
    end

    attr_reader :id, :label, :description
    attr_accessor :context

    def initialize(id:, records:, label: nil, description: nil, record: nil, **options)
      @id = id.to_s
      @label = label || id.to_s.humanize
      @description = description
      @records_lambda = records
      @record_lambda = record

      Options.assert_known!(options, context: "page :#{id}")
    end

    def records
      result = @records_lambda
      result = evaluate_lambda(result) if result.respond_to?(:call)

      (result || []).map do |entry|
        next entry unless entry.is_a?(Hash)

        entry = entry.symbolize_keys

        assert_known_record_keys!(entry)
        build_record(entry)
      end
    end

    def find_record(id)
      raise ActiveRecord::RecordNotFound unless @record_lambda

      record = @record_lambda
      record = context ? context.instance_exec(id, &record) : record.call(id) if record.respond_to?(:call)

      record or raise ActiveRecord::RecordNotFound
    end

    def decorate(view_context: nil)
      Page::Decorator.new(self, view_context: view_context)
    end

    def decorate_record(record, view_context: nil)
      Page::RecordDecorator.new(record, page: self, view_context: view_context)
    end

    private

    def evaluate_lambda(callable)
      context ? context.instance_exec(&callable) : callable.call
    end

    def assert_known_record_keys!(entry)
      unknown = entry.keys - Record.members
      return if unknown.empty?

      raise ArgumentError, "Unknown key#{"s" if unknown.size > 1} #{unknown.map(&:inspect).join(", ")} in records for page :#{id} (allowed: #{Record.members.map(&:inspect).join(", ")})"
    end

    def build_record(entry)
      Record.new(**entry)
    rescue ArgumentError => error
      raise ArgumentError, "#{error.message} (page :#{id})"
    end

    class << self
      def all
        Bord.pages
      end

      def find!(id)
        all.find { it.id == id.to_s } or raise ActiveRecord::RecordNotFound
      end
    end
  end
end
