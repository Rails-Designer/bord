class Customer
  include GlobalID::Identification

  DATA = [
    {id: 1, name: "Ada Lovelace", email: "ada@lovelace.dev", plan: "Scale", mrr: "$1,200", since: "March 2024"},
    {id: 2, name: "Grace Hopper", email: "grace@navy.mil", plan: "Scale", mrr: "$980", since: "July 2023"},
    {id: 3, name: "Alan Turing", email: "alan@bletchley.uk", plan: "Growth", mrr: "$420", since: "January 2025"},
    {id: 4, name: "Katherine Johnson", email: "kj@nasa.gov", plan: "Growth", mrr: "$360", since: "September 2024"},
    {id: 5, name: "Edsger Dijkstra", email: "ewd@utexas.edu", plan: "Starter", mrr: "$120", since: "June 2025"},
    {id: 6, name: "Barbara Liskov", email: "bl@mit.edu", plan: "Starter", mrr: "$99", since: "February 2025"},
    {id: 7, name: "Linus Torvalds", email: "linus@kernel.org", plan: "Scale", mrr: "$1,450", since: "November 2023"},
    {id: 8, name: "Margaret Hamilton", email: "mh@apollo.mit", plan: "Growth", mrr: "$540", since: "April 2024"}
  ].freeze

  attr_reader :id

  def initialize(id)
    @id = id
    @attributes = DATA.find { it[:id] == id.to_i } ||
      {id: id, name: "Customer ##{id}", email: nil, plan: "Starter", mrr: "$0", since: "Unknown"}
  end

  def self.recent(count)
    DATA.last(count).map { new(it[:id]) }
  end

  def self.all(count = DATA.size)
    DATA.first(count).map { new(it[:id]) }
  end

  def self.find(id)
    new(id.to_i)
  end

  def self.model_name
    ActiveModel::Name.new(self, nil, "Customer")
  end

  def name = @attributes[:name]
  def email = @attributes[:email]
  def plan = @attributes[:plan]
  def mrr = @attributes[:mrr]
  def since = @attributes[:since]

  def label = name

  def to_bord
    {title: name, description: "#{plan} plan"}
  end

  def impersonate
    Rails.logger.info "[Bord] Impersonating #{name}"
  end
end
