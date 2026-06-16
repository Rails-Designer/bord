module Bord
  class Engine < ::Rails::Engine
    isolate_namespace Bord

    initializer "bord.load_configuration" do |application|
      application.config.to_prepare do
        Bord::Loader.reload
      end
    end
  end
end
