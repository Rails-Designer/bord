module Bord
  class Configuration
    def metric(id, **options)
      add_widget(Widget.new(id: id, kind: :metric, **options))
    end

    def list(id, **options)
      add_widget(Widget.new(id: id, kind: :list, **options))
    end

    def category(id, **options, &block)
      if Bord.categories.any? { it.id == id.to_s }
        raise ArgumentError, "Category :#{id} is already defined"
      end

      category = Category.new(id: id, **options)
      Bord.categories << category

      previous_category = @category
      @category = category
      instance_eval(&block) if block
    ensure
      @category = previous_category
    end

    def page(id, **options)
      if Bord.pages.any? { it.id == id.to_s }
        raise ArgumentError, "Page :#{id} is already defined"
      end

      Bord.pages << Page.new(id: id, **options)
    end

    def parent_controller=(value)
      Bord.parent_controller = value
    end

    def title(value)
      Bord.title = value
    end

    def brand_hue=(value)
      Bord.brand_hue = value
    end

    private

    def add_widget(widget)
      if Bord.widgets.any? { it.id == widget.id }
        raise ArgumentError, "Widget :#{widget.id} is already defined"
      end

      if @category
        @category.widgets << widget
      else
        Bord.uncategoryed_widgets << widget
      end
    end
  end
end
