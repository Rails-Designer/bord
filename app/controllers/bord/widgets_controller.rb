module Bord
  class WidgetsController < ApplicationController
    before_action :set_dashboard

    def index
    end

    def show
      render json: {actions: @dashboard.widgets.flat_map { it.decorate(view_context: view_context).actions }}
    end

    private

    def set_dashboard
      @dashboard = Dashboard.new(self)
    end
  end
end
