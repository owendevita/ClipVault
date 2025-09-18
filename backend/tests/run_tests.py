import pytest
import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

if __name__ == "__main__":
    # Run all tests with detailed output
    pytest.main(["-v", "--capture=no"])