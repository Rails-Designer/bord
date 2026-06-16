require "json"

class Bord::PresetsGenerator < Rails::Generators::Base
  desc "Select Bord widget presets to add to your initializer"

  def select_presets
    @presets = discover_presets

    if @presets.empty?
      say "No presets found.", :red
      return
    end

    @presets.each_with_index do |preset, i|
      line = "#{i + 1}. #{preset["source"]} — #{preset["name"]} — #{preset["description"]}"
      line << " (#{preset["note"]})" if preset["note"]
      say line
    end

    selection = ask "Select presets (comma-separated numbers):"
    indices = selection.split(",").map(&:strip).map(&:to_i).map { |i| i - 1 }

    selected = indices.filter_map { |i| @presets[i] }

    if selected.empty?
      say "No presets selected.", :yellow
      return
    end

    generate_code(selected)
  end

  no_tasks do
    def discover_presets
      paths = if defined?(Bord::Engine)
        Dir[Bord::Engine.root.join("lib", "bord", "presets", "*.json")]
      else
        []
      end

      from_gems = Gem.find_files("bord/presets/*.json")

      (paths + from_gems).uniq.flat_map { |f|
        source = File.basename(f, ".json").tr("_", " ").split.map(&:capitalize).join(" ")
        JSON.parse(File.read(f)).map { |preset| preset.merge("source" => source) }
      }
    end

    def generate_code(selected)
      lines = selected.flat_map { |preset|
        code = preset["code"]
        code.is_a?(Array) ? code : [code]
      }

      path = "config/bord/presets.rb"
      create_file(path) unless File.exist?(path)
      append_to_file(path, "\n#{lines.join("\n")}\n")

      say "Added #{selected.size} preset(s) to #{path}", :green
    end
  end
end
