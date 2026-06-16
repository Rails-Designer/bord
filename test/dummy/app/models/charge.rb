class Charge
  include GlobalID::Identification

  attr_reader :id

  def initialize(id)
    @id = id
  end

  def self.find(id)
    new(id.to_i)
  end

  def self.model_name
    ActiveModel::Name.new(self, nil, "Charge")
  end

  def label
    "Charge ##{id}"
  end

  def refund(customer_id:)
    Rails.logger.info "[Bord] Refunding #{label} for customer #{customer_id}"
  end

  def fail_refund(customer_id:)
    raise StandardError, "Refund failed"
  end
end
