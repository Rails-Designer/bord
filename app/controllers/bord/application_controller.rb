module Bord
  class ApplicationController < Bord.parent_controller.constantize
    before_action :require_configured_controller

    class << self
      attr_accessor :unconfigured_warning_logged
    end
    self.unconfigured_warning_logged = false

    private

    def require_configured_controller
      return unless Bord.locked?

      unless self.class.unconfigured_warning_logged
        self.class.unconfigured_warning_logged = true
        Rails.logger.warn("Bord is mounted but not configured for production. All /bord requests return 404. Set an authenticated parent controller, for example: Bord.configure { |config| config.parent_controller = \"Admin::BaseController\" }")
      end

      raise ActiveRecord::RecordNotFound
    end
  end
end
