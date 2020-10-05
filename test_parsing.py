from logic.timing_file_parser import read_timings
from models.config_info import ConfigInfo

def main():
    config = ConfigInfo([
        {
            "name": "timing",
            "filepath": "~/Documents/note/timing-2020.txt.copy.txt"
        }
        ])
    read_timings(config)

if __name__ == "__main__":
    #asyncio.run(main())
    main()
