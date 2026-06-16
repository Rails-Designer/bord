class Bord::InstallGenerator < Rails::Generators::Base
  desc "Installs Bord: creates configuration and mounts the engine"

  def create_configuration
    create_file "config/bord/dashboard.rb", <<~RUBY
      Bord.draw do
        metric :users, label: "Users", value: -> { User.count }
        list :recent, label: "Recent", items: -> { User.limit(3) }
      end
    RUBY
  end

  def mount_engine
    route 'mount Bord::Engine => "/bord"'
  end
end
