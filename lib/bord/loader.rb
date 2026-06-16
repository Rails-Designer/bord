module Bord
  module Loader
    def self.reload
      Bord.reset!
      Dir[Rails.root.join("config", "bord", "**", "*.rb")].sort.each { Kernel.load(it) }
    end
  end
end
