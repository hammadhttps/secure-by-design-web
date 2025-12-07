# scripts/generate_reports.py
import pandas as pd
import matplotlib.pyplot as plt
from mysql.connector import connect
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from backend/.env
env_path = Path(__file__).parent.parent / 'backend' / '.env'
load_dotenv(dotenv_path=env_path)

class PasswordReportGenerator:
    def __init__(self):
        # Use the same database configuration as backend/config/database.js
        # Load environment variables from backend/.env
        db_config = {
            'host': os.getenv('DB_HOST') or 'localhost',
            'port': int(os.getenv('DB_PORT') or '3306'),
            'user': os.getenv('DB_USER') or 'root',
            'password': os.getenv('DB_PASSWORD') or '',
            'database': os.getenv('DB_NAME') or 'security_project'
        }
        
        print(f"Connecting to database: {db_config['host']}:{db_config['port']}/{db_config['database']}")
        print(f"Using user: {db_config['user']}")
        self.db = connect(**db_config)
        
    def get_password_data(self):
        query = """
        SELECT password_hash, LENGTH(password_hash) as hash_length,
               created_at FROM users
        """
        return pd.read_sql(query, self.db)
    
    def analyze_hashes(self):
        df = self.get_password_data()
        
        if df.empty:
            print("No password data found in the database.")
            return
        
        # Calculate hash type distribution
        df['hash_type'] = df['password_hash'].apply(self.detect_hash_type)
        
        # Generate report
        self.generate_plots(df)
        self.export_to_excel(df)
        print("Reports generated successfully!")
        print(f"- password_analysis_report.png")
        print(f"- password_analysis.xlsx")
        
    def detect_hash_type(self, hash_value):
        if hash_value.startswith('$2b$') or hash_value.startswith('$2a$') or hash_value.startswith('$2y$'):
            return 'bcrypt'
        elif hash_value.startswith('$argon2'):
            return 'argon2'
        else:
            return 'unknown'
    
    def generate_plots(self, df):
        fig, axes = plt.subplots(2, 2, figsize=(12, 10))
        
        # Hash type distribution
        hash_counts = df['hash_type'].value_counts()
        if not hash_counts.empty:
            hash_counts.plot.pie(
                ax=axes[0,0], autopct='%1.1f%%', title='Hash Algorithm Distribution'
            )
        
        # Hash length distribution
        df['hash_length'].hist(ax=axes[0,1], bins=20)
        axes[0,1].set_title('Hash Length Distribution')
        axes[0,1].set_xlabel('Hash Length')
        axes[0,1].set_ylabel('Frequency')
        
        # Creation timeline
        df['created_at'] = pd.to_datetime(df['created_at'])
        timeline = df.groupby(df['created_at'].dt.date).size()
        if not timeline.empty:
            timeline.plot(ax=axes[1,0], title='Accounts Created Over Time')
            axes[1,0].set_xlabel('Date')
            axes[1,0].set_ylabel('Number of Accounts')
        
        # Hide the last subplot if not needed
        axes[1,1].axis('off')
        
        plt.tight_layout()
        output_path = Path(__file__).parent / 'password_analysis_report.png'
        plt.savefig(output_path, dpi=300, bbox_inches='tight')
        print(f"Plot saved to: {output_path}")
        
    def export_to_excel(self, df):
        output_path = Path(__file__).parent / 'password_analysis.xlsx'
        with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='Raw Data', index=False)
            
            # Summary statistics
            summary_data = {
                'Metric': ['Total Passwords', 'Average Hash Length'],
                'Value': [len(df), round(df['hash_length'].mean(), 2)]
            }
            
            if not df['hash_type'].mode().empty:
                summary_data['Metric'].append('Most Common Algorithm')
                summary_data['Value'].append(df['hash_type'].mode()[0])
            
            if not df['created_at'].empty:
                summary_data['Metric'].append('Date Range')
                summary_data['Value'].append(f"{df['created_at'].min()} to {df['created_at'].max()}")
            
            summary = pd.DataFrame(summary_data)
            summary.to_excel(writer, sheet_name='Summary', index=False)
        
        print(f"Excel report saved to: {output_path}")

if __name__ == '__main__':
    import sys
    try:
        print("Starting report generation...")
        print(f"Loading environment from: {Path(__file__).parent.parent / 'backend' / '.env'}")
        generator = PasswordReportGenerator()
        print("Database connected successfully!")
        generator.analyze_hashes()
        print("Report generation completed!")
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)
