module Bord
  class Dashboard
    def initialize(view)
      @view = view
    end

    def categories
      Bord.sort_by_position(Bord.categories.select { it.show?(@view) }).map { |category| [category, category_widgets(category)] }
    end

    def uncategoryed_widgets
      Bord.sort_by_position(Bord.uncategoryed_widgets.select { it.show?(@view) })
    end

    def widgets
      Bord.widgets.select { it.show?(@view) }
    end

    private

    def category_widgets(category)
      Bord.sort_by_position(category.widgets.select { it.show?(@view) })
    end
  end
end
