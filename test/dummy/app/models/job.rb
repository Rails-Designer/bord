class Job
  include GlobalID::Identification

  DATA = [
    {id: 1, name: "SyncInvoices", queue: "default", error: "Net::ReadTimeout"},
    {id: 2, name: "SendWeeklyDigest", queue: "mailers", error: "SMTPServerError"},
    {id: 3, name: "ProcessRefund", queue: "default", error: "Stripe::CardError"},
    {id: 4, name: "ImportCustomers", queue: "default", error: "ActiveJob::DeserializationError"}
  ].freeze

  attr_reader :id

  def initialize(id)
    @id = id
    @attributes = DATA.find { it[:id] == id.to_i } ||
      {id: id, name: "Job ##{id}", queue: "default", error: nil}
  end

  def self.recent(count)
    DATA.first(count).map { new(it[:id]) }
  end

  def self.find(id)
    new(id.to_i)
  end

  def self.model_name
    ActiveModel::Name.new(self, nil, "Job")
  end

  def name = @attributes[:name]
  def queue = @attributes[:queue]
  def error = @attributes[:error]

  def label = "#{name} (#{queue})"

  def reenqueue
    Rails.logger.info "[Bord] Reenqueuing #{label}"
  end
end
