module Bord
  class PagesController < ApplicationController
    def show
      @page = Page.find!(params[:id])
      @page.context = self

      respond_to do |format|
        format.html
        format.json { render json: {actions: @page.decorate(view_context: view_context).actions} }
      end
    end
  end
end
