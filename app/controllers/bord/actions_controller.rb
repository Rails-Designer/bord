module Bord
  class ActionsController < ApplicationController
    before_action :set_page, :set_widget, only: :create

    def create
      AllowedActions.validate!(@page || @widget, controller: self, params: params)

      Bord::Action.run(params)

      if request.headers["Attract"].present?
        render json: {actions: AttractActions.response_actions(@widget, @page, view_context)}
      else
        flash[:notice] = "Action completed"
        redirect_back fallback_location: root_path
      end
    end

    private

    def set_page
      owner = params[:owner].to_s
      @page = Page.find!(owner.delete_prefix("page:")) if owner.start_with?("page:")
    end

    def set_widget
      @widget = Bord.widgets.find { it.id == params[:owner].to_s } unless @page
    end
  end
end
